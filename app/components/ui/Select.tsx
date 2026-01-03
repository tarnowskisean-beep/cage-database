import React from 'react';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ style, className, ...props }, ref) => (
        <select
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

Select.displayName = 'Select';
