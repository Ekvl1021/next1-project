import UserInfo from "./UserInfo";

export default function Header({ title }: { title: string }) {
  return <header className="topbar"><div className="breadcrumb">Сургалтын систем <span>/</span> <b>{title}</b></div><div className="top-actions"><span className="today">2026 оны намрын улирал</span><UserInfo /></div></header>;
}
