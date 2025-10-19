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
import { useEffect, useState } from 'react'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'

type NavItem =
  | { label: string; to: string; key: string }
  | { label: string; to?: string; key: string; children: Array<{ label: string; to: string; key: string }> }

const navItems: NavItem[] = [
  { label: 'Overview', to: '/', key: 'overview' },
  { label: 'Live Map', to: '/live-map', key: 'live-map' },
  {
    label: 'Drivers',
    key: 'drivers',
    children: [
      { label: 'Driver Console', to: '/drivers', key: 'drivers:console' },
      { label: 'Driver Generator', to: '/drivers/generator', key: 'drivers:generator' },
    ],
  },
  { label: 'Riders', to: '/riders', key: 'riders' },
  {
    label: 'Trips',
    key: 'trips',
    children: [
      { label: 'Trip Console', to: '/trips', key: 'trips:console' },
      { label: 'Trip Generator', to: '/trips/generator', key: 'trips:generator' },
    ],
  },
  { label: 'Offers', to: '/offers', key: 'offers' },
  { label: 'Telemetry', to: '/telemetry', key: 'telemetry' },
]

export const AppLayout = ({ children }: PropsWithChildren) => {
  const location = useLocation()
  const [openedSections, setOpenedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOpenedSections((prev) => {
      const next = { ...prev }
      navItems.forEach((item) => {
        if ('children' in item) {
          const childActive = item.children.some((child) => location.pathname === child.to)
          if (childActive) {
            next[item.key] = true
          } else if (next[item.key] === undefined) {
            next[item.key] = false
          }
        }
      })
      return next
    })
  }, [location.pathname])

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
              {navItems.map((item) => {
                if ('children' in item) {
                  const isChildActive = item.children.some((child) => location.pathname === child.to)
                  const opened = openedSections[item.key] ?? false

                  return (
                    <NavLink
                      key={item.key}
                      label={item.label}
                      active={isChildActive}
                      variant="filled"
                      c={isChildActive ? 'white' : undefined}
                      opened={opened}
                      rightSection={null}
                      onClick={() =>
                        setOpenedSections((prev) => ({
                          ...prev,
                          [item.key]: !opened,
                        }))
                      }
                    >
                      <Stack gap={4} pl="md">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.key}
                            component={RouterNavLink}
                            to={child.to}
                            label={child.label}
                            active={location.pathname === child.to}
                            variant="subtle"
                          />
                        ))}
                      </Stack>
                    </NavLink>
                  )
                }

                return (
                  <NavLink
                    key={item.key}
                    component={RouterNavLink}
                    to={item.to}
                    label={item.label}
                    active={location.pathname === item.to}
                    variant="filled"
                    c={location.pathname === item.to ? 'white' : undefined}
                  />
                )
              })}
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
