import React from 'react';

export const Label = ({ children, style, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label
        style={{
            display: 'block',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            marginBottom: '0.1rem',
            fontWeight: 500,
            ...style
        }}
        {...props}
    >
        {children}
    </label>
);
