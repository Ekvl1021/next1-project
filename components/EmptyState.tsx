import Icon, { type IconName } from "./Icon";
export default function EmptyState({ icon = "book", title, text, action, onAction }: { icon?: IconName; title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="sg-empty"><span><Icon name={icon} size={30} /></span><h3>{title}</h3><p>{text}</p>{action && onAction && <button className="sg-button sg-primary" onClick={onAction}>{action}</button>}</div>;
}
