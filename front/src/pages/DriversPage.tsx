import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Flex,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useEffect, useMemo, useState } from 'react'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { LocationPicker } from '@/components/location/LocationPicker'
import {
  useCreateDriverMutation,
  useDeleteDriverMutation,
  useDriversQuery,
  useUpdateDriverMutation,
} from '@/features/drivers/api'
import type { DriverProfile, DriverStatus } from '@/types/dispatch'
import type { LocationValue } from '@/types/maps'

const STATUS_OPTIONS: { value: DriverStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: 'green' },
  { value: 'busy', label: 'On Trip', color: 'yellow' },
  { value: 'offline', label: 'Offline', color: 'gray' },
]

export const DriversPage = () => {
  const driversQuery = useDriversQuery()
  const createDriver = useCreateDriverMutation()
  const updateDriver = useUpdateDriverMutation()
  const deleteDriver = useDeleteDriverMutation()
  const [driverLocation, setDriverLocation] = useState<LocationValue | null>(null)
  const [editingDriver, setEditingDriver] = useState<DriverProfile | null>(null)

  const form = useForm({
    initialValues: {
      name: '',
      status: 'available' as DriverStatus,
      rating: '4.8',
      vehicleNotes: '',
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? 'Name is required' : null),
      rating: (value) => {
        const numeric = Number(value)
        if (Number.isNaN(numeric)) {
          return 'Rating must be a number'
        }
        if (numeric < 0 || numeric > 5) {
          return 'Rating must be between 0 and 5'
        }
        return null
      },
    },
  })

  useEffect(() => {
    if (!editingDriver) {
      return
    }

    form.setValues({
      name: editingDriver.name,
      status: editingDriver.status,
      rating: editingDriver.rating.toString(),
      vehicleNotes: editingDriver.vehicleNotes ?? '',
    })

    setDriverLocation({
      lat: editingDriver.location.lat,
      lng: editingDriver.location.lng,
      label: `${editingDriver.location.lat.toFixed(5)}, ${editingDriver.location.lng.toFixed(5)}`,
    })
  }, [editingDriver?.id])

  const isEditing = useMemo(() => Boolean(editingDriver?.id), [editingDriver])

  const resetForm = () => {
    form.reset()
    setDriverLocation(null)
    setEditingDriver(null)
  }

  const handleSubmit = form.onSubmit(async (values) => {
    if (!driverLocation) {
      notifications.show({
        title: 'Select a location',
        message: 'Choose a point via search or map before continuing.',
        color: 'yellow',
      })
      return
    }

    try {
      if (isEditing && editingDriver) {
        await updateDriver.mutateAsync({
          id: editingDriver.id,
          name: values.name,
          status: values.status,
          rating: Number(values.rating),
          vehicleNotes: values.vehicleNotes || undefined,
          location: {
            lat: driverLocation.lat,
            lng: driverLocation.lng,
          },
        })

        notifications.show({
          title: 'Driver updated',
          message: `${values.name} changes saved`,
          color: 'blue',
        })
      } else {
        await createDriver.mutateAsync({
          name: values.name,
          status: values.status,
          rating: Number(values.rating),
          vehicleNotes: values.vehicleNotes || undefined,
          location: {
            lat: driverLocation.lat,
            lng: driverLocation.lng,
          },
        })

        notifications.show({
          title: 'Driver saved',
          message: `${values.name} added to dispatch pool`,
          color: 'green',
        })
      }

      resetForm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to save driver'
      notifications.show({ title: 'Request failed', message, color: 'red' })
    }
  })

  const openDeleteModal = (driver: DriverProfile) => {
    modals.openConfirmModal({
      title: `Remove ${driver.name}?`,
      centered: true,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      children: (
        <Text size="sm">
          This will remove the driver from the pool and cancel any pending offers. This action cannot be undone.
        </Text>
      ),
      onConfirm: async () => {
        try {
          await deleteDriver.mutateAsync(driver.id)
          notifications.show({
            title: 'Driver removed',
            message: `${driver.name} deleted successfully`,
            color: 'green',
          })
          if (editingDriver?.id === driver.id) {
            resetForm()
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unable to delete driver'
          notifications.show({ title: 'Request failed', message, color: 'red' })
        }
      },
    })
  }

  return (
    <Flex gap="xl" align="stretch" h="100%">
      <Paper shadow="xs" radius="md" p="xl" withBorder flex="1">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Title order={4}>Create / Update Driver</Title>
            <TextInput
              label="Driver Name"
              placeholder="e.g. Imane B."
              required
              {...form.getInputProps('name')}
            />
            <Select
              label="Status"
              data={STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))}
              {...form.getInputProps('status')}
            />
            <TextInput
              label="Rating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              {...form.getInputProps('rating')}
            />
            <Textarea
              label="Vehicle Notes"
              placeholder="Vehicle type, capacity, notes"
              minRows={3}
              {...form.getInputProps('vehicleNotes')}
            />
            <Divider />
            <LocationPicker
              label="Driver Location"
              value={driverLocation}
              onChange={setDriverLocation}
              referenceValue={
                editingDriver
                  ? {
                      lat: editingDriver.location.lat,
                      lng: editingDriver.location.lng,
                    }
                  : null
              }
              countryCodes={['dz']}
              height={360}
              mapId={`driver-location-${editingDriver?.id ?? 'new'}`}
            />
            <Group>
              <Button
                radius="md"
                type="submit"
                loading={createDriver.isPending || updateDriver.isPending}
              >
                {isEditing ? 'Update Driver' : 'Save Driver'}
              </Button>
              {isEditing && (
                <Button variant="subtle" onClick={resetForm} disabled={updateDriver.isPending}>
                  Cancel
                </Button>
              )}
            </Group>
          </Stack>
        </form>
      </Paper>
      <Paper withBorder radius="md" p="md" shadow="xs" style={{ flex: 1.2, overflow: 'auto' }}>
        <Group justify="space-between" mb="md">
          <Title order={5}>Registered Drivers</Title>
          {driversQuery.isFetching && <Loader size="sm" />}
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Rating</Table.Th>
                <Table.Th>H3 Cell</Table.Th>
                <Table.Th style={{ width: 120 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {driversQuery.data?.length ? (
                driversQuery.data.map((driver) => {
                  const statusMeta = STATUS_OPTIONS.find((option) => option.value === driver.status)
                  return (
                    <Table.Tr key={driver.id}>
                      <Table.Td>{driver.name}</Table.Td>
                      <Table.Td>
                        <Badge color={statusMeta?.color}>{statusMeta?.label ?? driver.status}</Badge>
                      </Table.Td>
                      <Table.Td>{driver.rating.toFixed(1)}</Table.Td>
                      <Table.Td>{driver.location.h3Index}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Edit driver">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => setEditingDriver(driver)}
                              aria-label={`Edit ${driver.name}`}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete driver">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => openDeleteModal(driver)}
                              aria-label={`Delete ${driver.name}`}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )
                })
              ) : (
                <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center" c="dimmed">
                    {driversQuery.isLoading ? 'Loading drivers…' : 'No drivers created yet.'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Flex>
  )
}
