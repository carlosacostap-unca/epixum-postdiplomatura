interface FormattedDateProps {
  date: string;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
  showTime?: boolean;
}

export default function FormattedDate({ date, options, className = "", showTime = false }: FormattedDateProps) {
  if (!date) return null;
  const dateObject = new Date(date);
  if (Number.isNaN(dateObject.getTime())) return null;

  const defaultOptions: Intl.DateTimeFormatOptions = showTime
    ? { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }
    : { year: "numeric", month: "numeric", day: "numeric" };
  const finalOptions = { timeZone: "America/Argentina/Buenos_Aires", ...defaultOptions, ...options };
  const formattedDate = new Intl.DateTimeFormat("es-AR", finalOptions).format(dateObject);

  return <time className={className} dateTime={date}>{formattedDate}</time>;
}
