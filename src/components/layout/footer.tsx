"use client";

import Link from 'next/link';
import React from 'react';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-neutral-900 text-neutral-400 mt-auto">
            <div className="container mx-auto px-4">
                <div className="py-4 space-y-4 text-center">
                    <div className="flex justify-center items-center flex-wrap gap-x-6 gap-y-2 text-sm">
                        <Link href="/legal/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/legal/user-agreement" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="/how-to-play" className="hover:text-white transition-colors">How to Play</Link>
                         <Link href="/legal/support" className="hover:text-white transition-colors">Support</Link>
                    </div>
                    <div className="flex justify-center items-center gap-2 pt-4 mt-4 border-t border-neutral-800">
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
