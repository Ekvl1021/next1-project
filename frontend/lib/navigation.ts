import type { DashboardSection, SessionUser } from './types';
import type { IconName } from '../components/Icon';
type NavItem = { key: DashboardSection; href: string; text: string; icon: IconName };
export function navigation(role: SessionUser['role']): NavItem[] {
  const home:NavItem={key:'overview',href:'/dashboard',text:'Нүүр хуудас',icon:'cap'};
  const teachers:NavItem={key:'teachers',href:'/teachers',text:'Багш нарын мэдээлэл',icon:'users'};
  const assessments:NavItem[]=[{key:'assignments',href:'/assignments',text:'Даалгавар',icon:'book'},{key:'exams',href:'/exams',text:'Шалгалт',icon:'check'}];
  if(role==='student') return [home,...assessments,{key:'planner',href:'/planner',text:'Санал болгох төлөвлөгөө',icon:'book'},{key:'selection',href:'/course-selection',text:'Хичээл сонголт',icon:'check'},{key:'schedule',href:'/schedule',text:'Миний хуваарь',icon:'calendar'},{key:'grades',href:'/grades',text:'Дүн, голч',icon:'chart'},teachers];
  if(role==='teacher') return [home,...assessments,{key:'courses',href:'/courses',text:'Миний заадаг хичээлүүд',icon:'book'},{key:'students',href:'/students',text:'Миний оюутнууд',icon:'users'},{key:'grades',href:'/grades',text:'Дүн оруулах',icon:'chart'},{key:'attendance',href:'/attendance',text:'Ирц бүртгэх',icon:'check'},teachers];
  return [home,{key:'selection',href:'/course-selection',text:'Сонголтын хүсэлтүүд',icon:'check'},{key:'schedule',href:'/schedule',text:'Хуваарь зохицуулах',icon:'calendar'},{key:'courses',href:'/courses',text:'Хичээлийн бүртгэл',icon:'book'},{key:'students',href:'/students',text:'Оюутны бүртгэл',icon:'users'},teachers,{key:'reports',href:'/reports',text:'Сургалтын тайлан',icon:'chart'}];
}
