'use client'

import * as React from 'react'
import Link from 'next/link'
import { Building, Mail, Phone, MapPin, ExternalLink } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

interface FooterSection {
  title: string
  links: FooterLink[]
}

const footerSections: FooterSection[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Características', href: '/caracteristicas' },
      { label: 'Precios', href: '/precios' },
      { label: 'Integraciones', href: '/integraciones' },
      { label: 'Actualizaciones', href: '/actualizaciones' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Documentación', href: '/documentacion' },
      { label: 'Guías', href: '/guias' },
      { label: 'API', href: '/api' },
      { label: 'Centro de Ayuda', href: '/ayuda' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre Nosotros', href: '/nosotros' },
      { label: 'Blog', href: '/blog' },
      { label: 'Carreras', href: '/carreras' },
      { label: 'Contacto', href: '/contacto' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos de Servicio', href: '/terminos' },
      { label: 'Política de Privacidad', href: '/privacidad' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
]

const contactInfo = [
  { icon: Mail, label: 'info@inmogestpro.pa', href: 'mailto:info@inmogestpro.pa' },
  { icon: Phone, label: '+507 200-0000', href: 'tel:+5072000000' },
  { icon: MapPin, label: 'Ciudad de Panamá, Panamá', href: '#' },
]

// Compact footer for main layout
export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4 text-primary" />
            <span>© {currentYear} InmoGest Pro. Todos los derechos reservados.</span>
          </div>
          
          {/* Quick links */}
          <div className="flex items-center gap-4 text-sm">
            <Link 
              href="/terminos" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Términos
            </Link>
            <Link 
              href="/privacidad" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacidad
            </Link>
            <Link 
              href="/contacto" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contacto
            </Link>
          </div>
          
          {/* Contact info */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <a 
              href="mailto:info@inmogestpro.pa" 
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">info@inmogestpro.pa</span>
            </a>
            <a 
              href="tel:+5072000000" 
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">+507 200-0000</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Extended footer for landing/public pages
export function FooterExtended() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight">InmoGest</span>
                <span className="text-xs text-muted-foreground -mt-1">Pro</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              La plataforma completa para la administración de propiedades en Panamá.
            </p>
            
            {/* Contact info */}
            <div className="space-y-2">
              {contactInfo.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
          
          {/* Link columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                    >
                      {link.label}
                      {link.external && <ExternalLink className="h-3 w-3" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <Separator className="my-8" />
        
        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © {currentYear} InmoGest Pro. Todos los derechos reservados.
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Hecho con ❤️ en Panamá</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
