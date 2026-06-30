import { useState, useEffect } from 'react'

export const useDeviceDetect = () => {
  const [device, setDevice] = useState('desktop')

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      if (w < 768) setDevice('mobile')
      else if (w < 1024) setDevice('tablet')
      else setDevice('desktop')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return {
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isMobileOrTablet: device === 'mobile' || device === 'tablet',
    device
  }
}