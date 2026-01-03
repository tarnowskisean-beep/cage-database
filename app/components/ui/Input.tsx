import React from 'react';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ style, className, ...props }, ref) => (
        <input
            ref={ref}
            className={`input-field ${className || ''}`}
            style={{
                width: '100%',
                padding: '0.4rem',
                fontSize: '0.9rem',
                marginBottom: '0.5rem',
                ...style
            }}
            {...props}
        />
    )
);

Input.displayName = 'Input';
