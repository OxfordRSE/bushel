'use client'

import { Provider } from 'jotai'

export const StoreProvider = ({ children }: {children: React.ReactNode}) => {
    return (
        <Provider>
            {children}
        </Provider>
    )
}