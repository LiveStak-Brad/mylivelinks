 'use client';

 import { useEffect } from 'react';
 import { useRouter } from 'next/navigation';

 export default function RoomsRedirectPage() {
   const router = useRouter();

   useEffect(() => {
     router.replace('/liveTV');
   }, [router]);

   return null;
 }
