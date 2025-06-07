// Inspired by usehooks-ts
"use client"

import { type Dispatch, type SetStateAction, useEffect, useState, useCallback } from 'react'

type SetValue<T> = Dispatch<SetStateAction<T>>

export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [initialValue, key])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  const setValue: SetValue<T> = useCallback(
    value => {
      if (typeof window == 'undefined') {
        console.warn(
          `Tried setting localStorage key "${key}" even though environment is not a client`,
        )
      }

      try {
        const newValue = value instanceof Function ? value(storedValue) : value
        window.localStorage.setItem(key, JSON.stringify(newValue))
        setStoredValue(newValue)
        window.dispatchEvent(new Event('local-storage')) // For cross-tab updates
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue],
  )

  useEffect(() => {
    setStoredValue(readValue())
  }, [readValue])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | CustomEvent) => {
      if ((event as StorageEvent)?.key && (event as StorageEvent).key !== key) {
        return
      }
      setStoredValue(readValue())
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('local-storage', handleStorageChange) // For same-tab updates

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage', handleStorageChange)
    }
  }, [key, readValue])

  return [storedValue, setValue]
}
