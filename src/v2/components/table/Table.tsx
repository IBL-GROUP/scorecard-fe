import { Table as ChakraTable, Badge, Box, HStack, Text, Input } from "@chakra-ui/react"
import { useState } from "react"
import { FiUsers, FiSearch } from "react-icons/fi"

interface TableRow {
    id: number
    name: string
    role: string
    status: string
}

interface TableProps {
    data: TableRow[]
    title?: string
}

export const Table = ({ data, title = "Team Members" }: TableProps) => {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredData = data.filter((row) =>
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.status.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <>
            <HStack
                justify="space-between"
                p={4}
            >
                <HStack gap={2}>
                    <FiUsers size={20} />
                    <Text fontWeight="medium" fontSize="lg">
                        {title}
                    </Text>
                </HStack>
                <Box position="relative" maxW="250px">
                    <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="sm"
                        pl={9}
                    />
                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="var(--sp-muted-text)">
                        <FiSearch size={14} />
                    </Box>
                </Box>
            </HStack>
            <ChakraTable.Root size="md">
                <ChakraTable.Header>
                    <ChakraTable.Row>
                        <ChakraTable.ColumnHeader>ID</ChakraTable.ColumnHeader>
                        <ChakraTable.ColumnHeader>Name</ChakraTable.ColumnHeader>
                        <ChakraTable.ColumnHeader>Role</ChakraTable.ColumnHeader>
                        <ChakraTable.ColumnHeader>Status</ChakraTable.ColumnHeader>
                    </ChakraTable.Row>
                </ChakraTable.Header>
                <ChakraTable.Body>
                    {filteredData.map((row) => (
                        <ChakraTable.Row key={row.id}>
                            <ChakraTable.Cell>{row.id}</ChakraTable.Cell>
                            <ChakraTable.Cell>{row.name}</ChakraTable.Cell>
                            <ChakraTable.Cell>{row.role}</ChakraTable.Cell>
                            <ChakraTable.Cell>
                                <Badge
                                    colorPalette={row.status === 'Active' ? 'green' : 'red'}
                                >
                                    {row.status}
                                </Badge>
                            </ChakraTable.Cell>
                        </ChakraTable.Row>
                    ))}
                </ChakraTable.Body>
            </ChakraTable.Root>
        </>
    )
}
