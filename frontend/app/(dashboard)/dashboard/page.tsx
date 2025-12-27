'use client';

import { useAuth } from '@/providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Heart, MessageSquare, Eye } from 'lucide-react';

const stats = [
  {
    title: 'My Properties',
    value: '0',
    description: 'Active listings',
    icon: Home,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  {
    title: 'Favorites',
    value: '0',
    description: 'Saved properties',
    icon: Heart,
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
  {
    title: 'Negotiations',
    value: '0',
    description: 'Active offers',
    icon: MessageSquare,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  {
    title: 'Views',
    value: '0',
    description: 'This month',
    icon: Eye,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.firstName || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your properties today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`rounded-full p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest property interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity</p>
              <p className="text-sm mt-1">
                Start browsing properties or create a listing
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Stay updated on your properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No new notifications</p>
              <p className="text-sm mt-1">
                We&apos;ll notify you when something important happens
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase 2+ Notice */}
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Dashboard statistics and activity will be populated in Phase 2+
            when the property browsing features are integrated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
