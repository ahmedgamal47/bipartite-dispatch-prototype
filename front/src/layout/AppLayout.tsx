import {
  AppShell,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import type { PropsWithChildren } from 'react'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Overview', to: '/' },
  { label: 'Drivers', to: '/drivers' },
  { label: 'Riders', to: '/riders' },
  { label: 'Trips', to: '/trips' },
  { label: 'Offers', to: '/offers' },
  { label: 'Telemetry', to: '/telemetry' },
]

export const AppLayout = ({ children }: PropsWithChildren) => {
  const location = useLocation()

  return (
    <AppShell
      padding="lg"
      header={{ height: 72 }}
      navbar={{ width: 260, breakpoint: 'sm' }}
      styles={{ main: { backgroundColor: '#f4f6fb' } }}
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Title order={3}>Operational Console</Title>
          <Text size="sm" c="dimmed">
            Prototype build · {new Date().toLocaleDateString()}
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="md" h="100%">
          <Title order={4}>Dispatch POC</Title>
          <ScrollArea type="auto">
            <Stack gap="xs">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  component={RouterNavLink}
                  to={item.to}
                  label={item.label}
                  active={location.pathname === item.to}
                  variant="filled"
                  c={location.pathname === item.to ? 'white' : undefined}
                />
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
