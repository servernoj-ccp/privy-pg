import { Umzug, SequelizeStorage } from 'umzug'
import cac from 'cac'
import { getStatusFactory, withCleanupFactory, generateMigration } from './helpers'
import p from 'node:path'
import { fileURLToPath } from 'node:url'

export const getMigrationPath = (path?: string) => {
  const baseURL = new URL('../db/migrations/', import.meta.url)
  return fileURLToPath(new URL(path ?? '', baseURL))
}

const runner = async () => {
  const { sequelize } = await import('@/db')
  await sequelize.authenticate().catch(
    e => {
      console.warn('Unable to ping DB', e.message)
      process.exit(1)
    }
  )
  const umzug = new Umzug({
    migrations: {
      glob: ['*.ts', { cwd: getMigrationPath() }],
      resolve: ({ name, path, context }) => {
        name = p.parse(name).name
        return Umzug.defaultResolver({ name, path, context })
      }
    },
    context: sequelize,
    storage: new SequelizeStorage({ sequelize, tableName: 'migrations' }),
    logger: undefined
  })

  const getStatus = getStatusFactory(umzug)
  const withCleanup = withCleanupFactory(
    () => sequelize.close()
  )


  // -- CLI interface

  const cli = cac('npm run db:migrate')

  cli.option('-v, --verbose', 'Print result')

  cli
    .command('create <name>', 'Create new migration')
    .action(
      withCleanup(
        async (name) => {
          await generateMigration(name)
        }
      )
    )

  cli
    .command('up [N]', 'Apply all (up to N) available migrations')
    .action(
      withCleanup(
        async (N, opts) => {
          if (typeof N === 'undefined') {
            await umzug.up()
          } else {
            await umzug.up({ step: N })
          }
          await getStatus(opts.verbose)
        }
      )
    )

  cli
    .command('up-to <name>', 'Apply migrations up to specific one')
    .action(
      withCleanup(
        async (to, opts) => {
          await umzug.up({ to })
          await getStatus(opts.verbose)
        }
      )
    )

  cli
    .command('down [N]', 'Revert one or N migrations')
    .action(
      withCleanup(
        async (N, opts) => {
          if (typeof N === 'undefined') {
            await umzug.down()
          } else {
            await umzug.down({ step: N })
          }
          await getStatus(opts.verbose)
        }
      )
    )

  cli
    .command('down-to <name>', 'Revert migrations up to specific one. Pass 0 to revert all migrations')
    .action(
      withCleanup(
        async (to, opts) => {
          if (to === '0') {
            to = 0
          }
          await umzug.down({ to })
          await getStatus(opts.verbose)
        }
      )
    )

  cli
    .command('redo', 'Revert the most recently applied migration, then re-apply')
    .action(
      withCleanup(
        async (opts) => {
          await umzug.down()
          await umzug.up({ step: 1 })
          await getStatus(opts.verbose)
        }
      )
    )

  cli
    .command('status', 'Print the status of all migrations')
    .action(
      withCleanup(
        async () => {
          await getStatus(true)
        }
      )
    )

  cli.help()
  cli.parse()
}

runner()
