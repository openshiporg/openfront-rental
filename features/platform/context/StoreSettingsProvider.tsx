'use client'

import React, { createContext, useContext, useMemo } from 'react'

export interface StoreSettings {
  currencyCode: string
  locale: string
  timezone: string
  countryCode: string
}

interface StoreSettingsContextType {
  settings: StoreSettings
  formatCurrency: (amount: number, options?: { inputIsCents?: boolean }) => string
}

const StoreSettingsContext = createContext<StoreSettingsContextType | null>(null)

export const DEFAULT_SETTINGS: StoreSettings = {
  currencyCode: 'USD',
  locale: 'en-US',
  timezone: 'America/New_York',
  countryCode: 'US',
}

export function StoreSettingsProvider({
  children,
  initialSettings
}: {
  children: React.ReactNode,
  initialSettings?: Partial<StoreSettings> | null
}) {
  const settings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...(initialSettings || {}),
  }), [initialSettings])

  const NO_DIVISION_CURRENCIES = [
    "krw", "jpy", "vnd", "clp", "pyg", "xaf", "xof", "bif", "djf", "gnf", "kmf", "mga", "rwf", "xpf", "htg", "vuv", "xag", "xdr", "xau"
  ];

  const formatCurrency = (amount: number, options?: { inputIsCents?: boolean }) => {
    const inputIsCents = options?.inputIsCents ?? true
    const shouldDivideBy100 = !NO_DIVISION_CURRENCIES.includes(settings.currencyCode.toLowerCase())

    let value = amount
    if (inputIsCents && shouldDivideBy100) {
      value = amount / 100
    }

    return new Intl.NumberFormat(settings.locale, {
      style: 'currency',
      currency: settings.currencyCode,
    }).format(value)
  }

  const value = useMemo(() => ({
    settings,
    formatCurrency,
  }), [settings])

  return (
    <StoreSettingsContext.Provider value={value}>
      {children}
    </StoreSettingsContext.Provider>
  )
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext)
  if (!context) {
    // Fallback to defaults if provider is missing
    return {
      settings: DEFAULT_SETTINGS,
      formatCurrency: (amount: number, options?: { inputIsCents?: boolean }) => {
        const value = (options?.inputIsCents ?? true) ? amount / 100 : amount
        return new Intl.NumberFormat(DEFAULT_SETTINGS.locale, {
          style: 'currency',
          currency: DEFAULT_SETTINGS.currencyCode,
        }).format(value)
      }
    }
  }
  return context
}
