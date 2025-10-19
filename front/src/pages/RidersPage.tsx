import {
  ActionIcon,
  Button,
  Divider,
  Flex,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
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
  useCreateRiderMutation,
  useDeleteRiderMutation,
  useRidersQuery,
  useUpdateRiderMutation,
} from '@/features/riders/api'
import type { RiderProfile } from '@/types/dispatch'
import type { LocationValue } from '@/types/maps'

const formatLocation = (location?: LocationValue | { lat: number; lng: number }) => {
  if (!location) {
    return '—'
  }
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
}

export const RidersPage = () => {
  const ridersQuery = useRidersQuery()
  const createRider = useCreateRiderMutation()
  const updateRider = useUpdateRiderMutation()
  const deleteRider = useDeleteRiderMutation()

  const [pickupLocation, setPickupLocation] = useState<LocationValue | null>(null)
  const [editingRider, setEditingRider] = useState<RiderProfile | null>(null)

  const form = useForm({
    initialValues: {
      name: '',
      phone: '',
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? 'Name is required' : null),
      phone: (value) => (value.trim().length === 0 ? 'Phone is required' : null),
    },
  })

  useEffect(() => {
    if (!editingRider) {
      return
    }

    form.setValues({
      name: editingRider.name,
      phone: editingRider.phone,
    })

    setPickupLocation(
      editingRider.defaultPickup
        ? {
            lat: editingRider.defaultPickup.lat,
            lng: editingRider.defaultPickup.lng,
            label: editingRider.defaultPickup.address,
          }
        : null,
    )
  }, [editingRider?.id])

  const isEditing = useMemo(() => Boolean(editingRider?.id), [editingRider])

  const resetForm = () => {
    form.reset()
    setPickupLocation(null)
    setEditingRider(null)
  }

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      if (isEditing && editingRider) {
        await updateRider.mutateAsync({
          id: editingRider.id,
          name: values.name,
          phone: values.phone,
          defaultPickup: pickupLocation ?? undefined,
        })

        notifications.show({
          title: 'Rider updated',
          message: `${values.name} updated successfully`,
          color: 'blue',
        })
      } else {
        await createRider.mutateAsync({
          name: values.name,
          phone: values.phone,
          defaultPickup: pickupLocation ?? undefined,
        })

        notifications.show({
          title: 'Rider created',
          message: `${values.name} added to the directory`,
          color: 'green',
        })
      }

      resetForm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to save rider'
      notifications.show({ title: 'Request failed', message, color: 'red' })
    }
  })

  const openDeleteModal = (rider: RiderProfile) => {
    modals.openConfirmModal({
      title: `Remove ${rider.name}?`,
      centered: true,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      children: (
        <Text size="sm">
          This will remove the rider and their pending trip intents. This action cannot be undone.
        </Text>
      ),
      onConfirm: async () => {
        try {
          await deleteRider.mutateAsync(rider.id)
          notifications.show({
            title: 'Rider removed',
            message: `${rider.name} deleted successfully`,
            color: 'green',
          })
          if (editingRider?.id === rider.id) {
            resetForm()
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unable to delete rider'
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
            <Title order={4}>{isEditing ? 'Edit Rider' : 'Create Rider'}</Title>
            <TextInput
              label="Full Name"
              placeholder="e.g. Amel A."
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Phone Number"
              placeholder="+213 555 000 111"
              required
              {...form.getInputProps('phone')}
            />
            <Divider />
            <LocationPicker
              label="Default Pickup"
              value={pickupLocation}
              onChange={setPickupLocation}
              referenceValue={
                editingRider?.defaultPickup
                  ? {
                      lat: editingRider.defaultPickup.lat,
                      lng: editingRider.defaultPickup.lng,
                    }
                  : null
              }
              countryCodes={['dz']}
              mapId={`rider-pickup-${editingRider?.id ?? 'new'}`}
            />
            <Group>
              <Button
                radius="md"
                type="submit"
                loading={
                  createRider.isPending ||
                  updateRider.isPending
                }
              >
                {isEditing ? 'Update Rider' : 'Create Rider'}
              </Button>
              {isEditing && (
                <Button variant="subtle" onClick={resetForm} disabled={updateRider.isPending}>
                  Cancel
                </Button>
              )}
            </Group>
          </Stack>
        </form>
      </Paper>
      <Paper withBorder radius="md" p="md" shadow="xs" style={{ flex: 1.2, overflow: 'auto' }}>
        <Group justify="space-between" mb="md">
          <Title order={5}>Active Riders</Title>
          {ridersQuery.isFetching && <Loader size="sm" />}
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Phone</Table.Th>
              <Table.Th>Default Pickup</Table.Th>
              <Table.Th style={{ width: 120 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ridersQuery.data?.length ? (
              ridersQuery.data.map((rider) => (
                <Table.Tr key={rider.id}>
                  <Table.Td>{rider.name}</Table.Td>
                  <Table.Td>{rider.phone}</Table.Td>
                  <Table.Td>{formatLocation(rider.defaultPickup ?? undefined)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Edit rider">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => setEditingRider(rider)}
                          aria-label={`Edit ${rider.name}`}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete rider">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => openDeleteModal(rider)}
                          aria-label={`Delete ${rider.name}`}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center" c="dimmed">
                    {ridersQuery.isLoading ? 'Loading riders…' : 'No riders yet. Create one to get started.'}
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
