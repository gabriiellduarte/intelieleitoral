import { useState } from 'react';

const GRADIENTS = [
    'from-blue-500 to-blue-700',
    'from-violet-500 to-purple-700',
    'from-emerald-500 to-teal-700',
    'from-orange-500 to-amber-600',
    'from-rose-500 to-pink-700',
    'from-cyan-500 to-blue-600',
    'from-indigo-500 to-violet-700',
    'from-green-500 to-emerald-700',
];

function gradientFor(seed: number | string) {
    const n = typeof seed === 'string' ? seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : seed;
    return GRADIENTS[n % GRADIENTS.length];
}

type Props = {
    sqCandidato: string | null | undefined;
    numero: number | string;
    /** Índice da linha para variar o gradiente do fallback */
    index?: number;
    /** Tamanho: 'sm' = 36px | 'md' = 48px | 'lg' = 80px */
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    rounded?: 'full' | '2xl';
};

const SIZE_MAP = {
    sm: { wrapper: 'w-9 h-9',   text: 'text-sm'  },
    md: { wrapper: 'w-12 h-12', text: 'text-base' },
    lg: { wrapper: 'w-20 h-20', text: 'text-2xl'  },
};

export default function CandidatoAvatar({
    sqCandidato,
    numero,
    index = 0,
    size = 'sm',
    className = '',
    rounded = 'full',
}: Props) {
    const [imgError, setImgError] = useState(false);

    const { wrapper, text } = SIZE_MAP[size];
    const roundedClass = rounded === 'full' ? 'rounded-full' : 'rounded-2xl';
    const base = `${wrapper} ${roundedClass} flex-shrink-0 overflow-hidden ${className}`;

    // Tenta carregar a foto; se falhar, cai no gradiente
    const src = sqCandidato && !imgError
        ? `/imagenscand/FCE${sqCandidato}_div.jpeg`
        : null;

    if (src) {
        return (
            <div className={`${base} bg-gray-100`}>
                <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    // Fallback: gradiente com número
    const gradient = gradientFor(index);
    return (
        <div className={`${base} bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
            <span className={`font-bold text-white ${text} leading-none`}>{numero}</span>
        </div>
    );
}
