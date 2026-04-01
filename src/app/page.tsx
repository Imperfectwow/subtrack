import { redirect } from 'next/navigation'

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const params = await searchParams
  if (params.code) {
    redirect(`/auth/confirm?code=${params.code}`)
  }
  redirect('/login')
}
