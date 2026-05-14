'use client';

import { useEffect } from 'react';

export default function MouseTracker() {
    useEffect(() => {
        const updateMousePosition = (ev: MouseEvent) => {
            const x = (ev.clientX / window.innerWidth) * 100;
            const y = (ev.clientY / window.innerHeight) * 100;
            document.documentElement.style.setProperty('--mouse-x', `${x}%`);
            document.documentElement.style.setProperty('--mouse-y', `${y}%`);
        };

        window.addEventListener('mousemove', updateMousePosition);

        return () => {
            window.removeEventListener('mousemove', updateMousePosition);
        };
    }, []);

    return null;
}
