import React, { useState, useEffect } from 'react';

const MenuBoardClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <span className="font-mono text-sm tracking-wider opacity-70">
      {formatted}
    </span>
  );
};

export default MenuBoardClock;
