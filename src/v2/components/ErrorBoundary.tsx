import { Component, ReactNode } from 'react'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { Button } from '@/v2/components/button'
import { FaExclamationTriangle } from 'react-icons/fa'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box minH="100vh" bg="var(--sp-sunk-bg)" display="flex" alignItems="center" justifyContent="center">
                    <Container maxW="container.md" textAlign="center">
                        <VStack gap={8}>
                            <Box fontSize="8xl" color="red.500">
                                <FaExclamationTriangle />
                            </Box>
                            <Heading size="2xl">Something Went Wrong</Heading>
                            <Text fontSize="lg" color="var(--sp-muted-text)" maxW="md">
                                An unexpected error has occurred. Please try refreshing the page.
                            </Text>
                            {this.state.error && (
                                <Box
                                    p={4}
                                    bg="red.50"
                                    borderRadius="md"
                                    borderWidth="1px"
                                    borderColor="red.200"
                                    maxW="lg"
                                    w="full"
                                >
                                    <Text fontSize="sm" fontFamily="mono" color="red.800">
                                        {this.state.error.message}
                                    </Text>
                                </Box>
                            )}
                            <Button
                                colorPalette="brand"
                                size="lg"
                                onClick={() => window.location.href = '/'}
                            >
                                Go Back Home
                            </Button>
                        </VStack>
                    </Container>
                </Box>
            )
        }

        return this.props.children
    }
}
