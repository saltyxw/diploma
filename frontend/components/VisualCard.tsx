import { IVisualCard } from "@/types/cardTypes";

export default function VisualCard({ children }: IVisualCard) {
    return (
        <article className='col-span-2 rounded-2xl p-5 bg-gray-800 w-full'>
            {children}
        </article>
    )
}