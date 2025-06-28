import Link from 'next/link';
import React from 'react';
import Image from 'next/image';
import { Bot, X, Youtube, Twitch, Instagram } from 'lucide-react';

const AndroidIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Bot {...props} />
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.86-.95-6.66-2.47-1.75-1.49-2.9-3.5-2.9-5.72.03-2.16 1.02-4.15 2.5-5.56.81-.76 1.79-1.29 2.89-1.66.02-3.18.02-6.37.01-9.56H12.525z"/>
    </svg>
);

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.885-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4464.8143-.6608 1.2844-1.2827-.2763-2.682-.2763-3.9626 0-.2144-.4701-.4498-.9091-.6608-1.2844a.0741.0741 0 0 0-.0785-.0371 19.7913 19.7913 0 0 0-4.885 1.5152.069.069 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0825.0825 0 0 0 .0814.0741c.466.0002.932-.0796 1.39-.2432a.074.074 0 0 0 .0517-.1176c-.2282-.6228-.4266-1.259-.5976-1.9222a.0741.0741 0 0 1 .0186-.0814c.4668-.4363.9063-.8421 1.304-1.2185a.0741.0741 0 0 1 .086-.0084c.0385.0188.0712.043.1026.0694.273.2373.5674.491.8765.7155a.0741.0741 0 0 0 .0859.003c.8232-.4213 1.71-.8062 2.6172-1.1419a.0741.0741 0 0 1 .0888.0076c.203.146.4024.3.5933.456a.0741.0741 0 0 0 .0859-.003c.309-.2245.6034-.4782.8765-.7155a.0741.0741 0 0 1 .1026-.0694.0741.0741 0 0 1 .086.0084c.3977.3764.8372.7822 1.304 1.2185a.0741.0741 0 0 1 .0186.0814c-.171.6632-.3694 1.2994-.5976-1.9222a.074.074 0 0 0 .0517.1176c.458.1636.924.2434 1.39.2432a.0825.0825 0 0 0 .0814-.0741c.4182-4.4779-.4342-9.012-.9606-13.6602a.069.069 0 0 0-.032-.0277zM8.02 15.3312c-.8232 0-1.4893-1.0075-1.4893-2.2212s.666-2.2212 1.4893-2.2212c.8232 0 1.4893 1.0075 1.4893 2.2212s-.666 2.2212-1.4893 2.2212zm7.9848 0c-.8232 0-1.4893-1.0075-1.4893-2.2212s.666-2.2212 1.4893-2.2212c.8232 0 1.4893 1.0075 1.4893 2.2212s-.666 2.2212-1.4893 2.2212z"/>
    </svg>
);

const companyLinks = [
    { name: 'About', href: '/legal/about' },
    { name: 'Developers', href: '/legal/developers' },
    { name: 'Support', href: '/legal/support' },
];

const legalLinks = [
    { name: 'User Agreement', href: '/legal/user-agreement' },
    { name: 'Privacy Policy', href: '/legal/privacy-policy' },
    { name: 'Compliance', href: '/legal/compliance' },
];

const gameplayLinks = [
    { name: 'How to Play', href: '/how-to-play' },
    { name: 'Fair Play', href: '/legal/fair-play' },
    { name: 'Privacy Settings', href: '/legal/privacy-settings' },
];

const socialLinks = [
    { name: 'Google Play Store', href: '#', icon: AndroidIcon },
    { name: 'TikTok', href: '#', icon: TikTokIcon },
    { name: 'X (Twitter)', href: '#', icon: X },
    { name: 'YouTube', href: '#', icon: Youtube },
    { name: 'Twitch', href: '#', icon: Twitch },
    { name: 'Instagram', href: '#', icon: Instagram },
    { name: 'Discord', href: '#', icon: DiscordIcon },
];

const FooterLinkList = ({ title, links }: { title: string, links: { name: string, href: string }[] }) => (
    <div>
        <h3 className="text-sm font-semibold text-neutral-200 tracking-wider uppercase mb-4">{title}</h3>
        <ul className="space-y-2">
            {links.map(link => (
                <li key={link.name}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                        {link.name}
                    </Link>
                </li>
            ))}
        </ul>
    </div>
);

export default function Footer() {
    return (
        <footer className="bg-neutral-900 text-neutral-400 py-12 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-8">
                    <div className="col-span-2 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <p className="text-sm text-neutral-500">Powered by</p>
                            <Link href="/" className="inline-block transition-opacity hover:opacity-80">
                                <Image
                                    src="/newlogo.png"
                                    alt="HousieHub Logo"
                                    width={160}
                                    height={45}
                                    className="h-auto"
                                />
                            </Link>
                        </div>
                        <p className="text-sm pr-4">
                           Play Housie online with friends and family.
                        </p>
                    </div>
                    <div className="col-span-1">
                        <FooterLinkList title="Company" links={companyLinks} />
                    </div>
                     <div className="col-span-1">
                        <FooterLinkList title="Legal" links={legalLinks} />
                    </div>
                     <div className="col-span-1">
                        <FooterLinkList title="Gameplay" links={gameplayLinks} />
                    </div>
                </div>
                
                <div className="mt-8 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-center">
                    <p className="text-sm text-neutral-500 order-2 sm:order-1 mt-4 sm:mt-0">HousieHub © 2025</p>
                    <div className="order-1 sm:order-2">
                        <div className="flex items-center space-x-6" aria-label="Social media links">
                            {socialLinks.map((social) => (
                                <Link
                                    href={social.href}
                                    key={social.name}
                                    aria-label={social.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-neutral-500 hover:text-white transition-colors"
                                >
                                    <social.icon className="h-5 w-5" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
