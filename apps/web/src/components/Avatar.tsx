type Props = { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' };

const colors = ['#6258d7', '#d45480', '#2e9476', '#d47a42', '#377dbd', '#8753b5'];

export function Avatar({ name, src, size = 'md' }: Props) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  const index = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
  return (
    <span className={`avatar avatar-${size}`} style={{ backgroundColor: colors[index] }} aria-label={name}>
      {src ? <img src={src} alt="" /> : initials || '?'}
    </span>
  );
}
