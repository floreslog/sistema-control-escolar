type StatCardProps = {
  label: string;
  value: string | number;
  tone?: 'default' | 'warning';
};

const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-white text-gray-900',
  warning: 'bg-amber-100 text-amber-900',
};

export default function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className={`rounded-xl p-4 ${TONE_CLASSES[tone]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}