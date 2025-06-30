"use client";

import Link from 'next/link';
import React from 'react';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-neutral-900 text-neutral-400 mt-auto">
            <div className="container mx-auto px-4">
                <div className="py-2">
                    <div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-2">
                        <div className="flex items-center gap-1">
                            <p className="text-xs text-neutral-500">Powered by</p>
                            <Link href="/" className="inline-block transition-opacity hover:opacity-80">
                                <Image
                                    src="/logonew.png"
                                    alt="HousieHub Logo"
                                    width={80}
                                    height={22}
                                    className="h-auto"
                                 />
                            </Link>
                        </div>
                         <p className="text-xs text-neutral-500">HousieHub © 2025</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
