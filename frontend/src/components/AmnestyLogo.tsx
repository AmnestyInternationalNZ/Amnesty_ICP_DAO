import React from 'react';

export default function AmnestyLogo() {
  return (
    <div className="amnesty-logo">
      <div className="bg-black p-4 border-4 border-amnesty-yellow">
        <div className="flex items-center space-x-3">
          {/* Candle Icon */}
          <div className="w-8 h-8 relative">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              {/* Flame */}
              <path
                d="M12 2C10.5 3.5 10 5.5 10 7C10 8.5 11 10 12 10C13 10 14 8.5 14 7C14 5.5 13.5 3.5 12 2Z"
                fill="#FFF200"
              />
              {/* Candle body */}
              <rect x="11" y="10" width="2" height="10" fill="#FFF200" />
              {/* Candle base */}
              <rect x="9" y="20" width="6" height="2" fill="#FFF200" />
            </svg>
          </div>
          {/* Amnesty text */}
          <div className="text-amnesty-yellow font-bold text-sm amnesty-heading tracking-wider">
            AMNESTY
          </div>
        </div>
      </div>
    </div>
  );
}
