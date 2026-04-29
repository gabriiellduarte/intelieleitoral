type Color = 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'cyan';

type Props = {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: string;
    color?: Color;
};

const bg: Record<Color, string> = {
    blue:   'bg-blue-50 border-blue-200',
    green:  'bg-emerald-50 border-emerald-200',
    purple: 'bg-purple-50 border-purple-200',
    amber:  'bg-amber-50 border-amber-200',
    red:    'bg-rose-50 border-rose-200',
    cyan:   'bg-cyan-50 border-cyan-200',
};

const iconCol: Record<Color, string> = {
    blue:   'text-blue-500',
    green:  'text-emerald-500',
    purple: 'text-purple-500',
    amber:  'text-amber-500',
    red:    'text-rose-500',
    cyan:   'text-cyan-500',
};

const valCol: Record<Color, string> = {
    blue:   'text-blue-700',
    green:  'text-emerald-700',
    purple: 'text-purple-700',
    amber:  'text-amber-700',
    red:    'text-rose-700',
    cyan:   'text-cyan-700',
};

export default function StatsCard({ title, value, subtitle, icon, color = 'blue' }: Props) {
    const display = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;

    return (
        <div className={`${bg[color]} border rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</span>
                {icon && <i className={`${icon} text-lg ${iconCol[color]}`}></i>}
            </div>
            <div className={`text-2xl font-bold ${valCol[color]}`}>{display}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
        </div>
    );
}
