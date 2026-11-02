import { useState } from 'react';

export default function ItemThumbnail({ item, size = 42 }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const style = {
    alignItems: 'center',
    background: '#eef3ef',
    borderRadius: 8,
    display: 'inline-flex',
    flex: `0 0 ${size}px`,
    height: size,
    justifyContent: 'center',
    overflow: 'hidden',
    width: size
  };

  return (
    <span aria-hidden="true" style={style}>
      {item.image && !imageUnavailable
        ? <img src={item.image} alt="" loading="lazy" onError={() => setImageUnavailable(true)} style={{ height: '100%', objectFit: 'cover', width: '100%' }} />
        : <strong>{item.name?.trim()?.[0]?.toUpperCase() || '?'}</strong>}
    </span>
  );
}
