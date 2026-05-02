import React from 'react';
import amnestyLogo from '../assets/branding/amnesty-logo-yellow.png';

interface AmnestyLogoProps {
  className?: string;
  imageClassName?: string;
  caption?: string;
}

export default function AmnestyLogo({
  className = '',
  imageClassName = '',
  caption,
}: AmnestyLogoProps) {
  return (
    <div className={`amnesty-logo ${className}`.trim()}>
      <img
        src={amnestyLogo}
        alt="Amnesty International"
        className={imageClassName}
      />
      {caption ? (
        <p className="amnesty-kicker text-black">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
