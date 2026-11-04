import React from 'react'
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { tools } from "./tools"
export default function Homepage() {
    return (
        <div className='items-center'>
            <div className=' top-0 z-0 flex min-h-[100svh] flex-col items-center justify-center px-5 py-10 text-center'>
                <h1 className='flex text-10xl  font-bold text-9xl text-center'>
                    Drift Field
                </h1>
                <p className='text-3xl font-bold italic'>"Create your own drift field"</p>
            </div>
            <div className="relative z-20 grid gap-5 bg-gradient-to-r from-[#001a13] to-[#004c39] p-4 sm:gap-6 sm:p-20 lg:z-auto lg:bg-none md:grid-cols-3">
                {tools.map((tool) => (
                    <div key={tool.id} className="overflow-hidden rounded-2xl border border-emerald-100/10 bg-[#000000] transition-colors hover:border-white-300/40">
                        <div className="relative aspect-[16/10] overflow-hidden">
                            <img
                                src={tool.imageUrl}
                                alt={tool.name}
                                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            />


                        </div>
                        <div className="p-5 sm:p-6">
                            <h2 className="text-xl font-bold leading-snug sm:text-2xl">
                                {tool.name}
                            </h2>
                            <p className="mt-3 leading-relaxed text-emerald-50/80">
                                {tool.summary}
                            </p>
                        </div>
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                            <a
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group inline-flex items-center gap-2 rounded-lg border border-zinc-400/30 bg-zinc-400/10 px-4 py-2 text-sm font-semibold text-zinc-200 transition-all hover:border-zinc-300/60 hover:bg-zinc-400/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
                            >
                                Try out
                                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </a>
                        </div>
                    </div>
                ))}



            </div>
        </div>
    )
}
