
import Link from 'next/link';

export const NavItem = ({ href, icon, label, active, collapsed }: { href: string, icon: string, label: string, active: boolean, collapsed: boolean }) => (
    <li>
        <Link
            href={href}
            className={`
                group flex items-center gap-4 px-4 py-3 mx-2 rounded-md transition-all duration-200
                ${active
                    ? 'bg-white text-black font-semibold shadow-lg shadow-white/5'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
                ${collapsed ? 'justify-center mx-1 px-2' : ''}
            `}
            title={collapsed ? label : undefined}
        >
            <span className={`text-xl transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
            </span>
            {!collapsed && (
                <span className="text-sm tracking-wide">{label}</span>
            )}
            {/* Active Indicator Dot */}
            {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black"></span>
            )}
        </Link>
    </li>
);
