import { useState } from 'react';
import { fallbackInitials } from '../lib/format';

export default function CandidateImage({ src, alt, size = 48, rounded = 'full' }) {
  const [errored, setErrored] = useState(false);
  const dim = { width: size, height: size };
  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-lg';

  if (!src || errored) {
    return (
      <div
        className={`${radius} bg-slate-200 text-slate-600 grid place-items-center font-semibold`}
        style={dim}
        aria-label={alt}
      >
        {fallbackInitials(alt)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${radius} object-cover bg-slate-100 ring-1 ring-slate-200`}
      style={dim}
      onError={() => setErrored(true)}
    />
  );
}
