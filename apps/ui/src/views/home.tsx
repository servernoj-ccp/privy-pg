import Markdown from 'react-markdown'
import remarkSlug from 'rehype-slug'
import description from '@/assets/description.md?raw'
import { useLocation } from 'react-router'
import { RefObject, useEffect, useRef } from 'react'

function LinkRenderer (props: any) {
  return (
    <a href={props.href} target="_blank" rel="noreferrer">
      {props.children}
    </a>
  )
}

export default function () {
  const location = useLocation()
  const markdownContainer = useRef<HTMLElement>(null) as RefObject<HTMLElement>
  const handleScrollToHash = () => {
    const { hash } = location
    if (hash) {
      const element = document.querySelector(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }
  useEffect(
    () => {
      const images = markdownContainer.current.querySelectorAll('img')
      let loadedCount = 0
      const onImageLoaded = () => {
        loadedCount += 1
        if (loadedCount === images.length) {
          handleScrollToHash()
        }
      }
      images.forEach((img) => {
        if (img.complete) {
          onImageLoaded()
        } else {
          img.addEventListener('load', onImageLoaded)
          img.addEventListener('error', onImageLoaded)
        }
      })
      return () => {
        images.forEach((img) => {
          img.removeEventListener('load', onImageLoaded)
          img.removeEventListener('error', onImageLoaded)
        })
      }
    },
    []
  )

  return <section ref={markdownContainer}>
    <Markdown
      components={{ a: LinkRenderer }}
      rehypePlugins={[remarkSlug]}
    >
      {description}
    </Markdown>
  </section>
}
