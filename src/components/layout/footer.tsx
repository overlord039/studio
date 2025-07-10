
"use client";

import Link from 'next/link';
import React from 'react';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-neutral-900 text-neutral-400 mt-auto">
            <div className="container mx-auto px-4">
                <div className="py-2 text-center">
                    <div className="flex justify-center items-center gap-2">
                        <p className="text-xs text-neutral-500">HousieHub © 2025. Powered by</p>
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
                </div>
            </div>
        </footer>
    );
}
