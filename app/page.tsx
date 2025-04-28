"use client"

import React from "react";
import dynamic from 'next/dynamic'

// Use dynamic import with SSR disabled for the Earth component
// to prevent hydration issues with the canvas
const Earth = dynamic(() => import('./components/Earth'), { ssr: false })

export default function Home() {
  return <Earth />
}
