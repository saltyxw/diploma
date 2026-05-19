import { ReactNode } from "react"

export interface ICard {
    className?: string
}

export interface IVisualCard extends ICard {
    children: ReactNode
}

export interface ITextCard extends ICard {
    text: string
    value: number | string
}

