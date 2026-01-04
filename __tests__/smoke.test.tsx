import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

function TestComponent() {
    return <div>Hello Test World</div>
}

describe('Smoke Test', () => {
    it('should pass basic math', () => {
        expect(1 + 1).toBe(2)
    })

    it('should render react component', () => {
        render(<TestComponent />)
        expect(screen.getByText('Hello Test World')).toBeDefined()
    })
})
