import React from 'react'

export default function Skeleton({ lines = 3 }) {
  return (
    <div className="skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeletonLine" />
      ))}
    </div>
  )
}
