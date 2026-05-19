import { ITextCard } from "@/types/cardTypes"

export default function TextCard(props: ITextCard) {
    return (
        <article className='bg-gray-800 max-w-[300px] p-5 rounded-3xl max-h-[150px] justify-items-center w-full h-full'>
            <p>{props.text}</p>
            <p className='text-center text-4xl '>{props.value}</p>
        </article>
    )
}