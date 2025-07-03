import { Umzug, MigrationError } from 'umzug'
import { Sequelize } from 'sequelize'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { getMigrationPath } from './'

type AsyncFn = (...args: any) => Promise<any>

const generateMigration = async (name: string) => {
  const timestamp = new Date().valueOf()
  const fileName = `${timestamp}-${name}.ts`
  const dstPath = getMigrationPath(fileName)
  const srcPath = fileURLToPath(new URL('./template.ts', import.meta.url))
  // Copy template
  fs.copyFileSync(srcPath, dstPath)
}

const getStatusFactory = (umzug: Umzug<Sequelize>) => {
  return async (verbose: boolean) => {
    const namesOnly = (items: Array<{name: string}>) => items.map(({ name }) => name)
    if (verbose) {
      const pending = await umzug.pending().then(namesOnly)
      const executed = await umzug.executed().then(namesOnly)
      console.log({ pending, executed })
    }
  }
}

const withCleanupFactory = (cleanupFn: AsyncFn) => {
  return (action: AsyncFn) => {
    return async (...args: any[]) => {
      try {
        await action(...args)
      } catch (e) {
        if (e instanceof MigrationError) {
          console.error(e.cause)
        } else {
          throw e
        }
      } finally {
        await cleanupFn()
      }
    }
  }
}


export {
  generateMigration,
  getStatusFactory,
  withCleanupFactory
}
