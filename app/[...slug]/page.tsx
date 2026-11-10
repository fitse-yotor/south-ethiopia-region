import Portal from '@/components/justice-portal';
export async function generateMetadata({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;return {title:slug.map(s=>s.replaceAll('-',' ')).join(' · ')+' | Southern Ethiopia Justice',description:'Southern Ethiopia Justice Department portal prototype. Sample resources and citizen service workflows.'}}
export default function Page(){return <Portal/>}
