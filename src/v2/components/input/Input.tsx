import { Input as ChakraInput, Box, Text } from "@chakra-ui/react"
import type { InputProps as ChakraInputProps } from "@chakra-ui/react"

interface InputProps extends ChakraInputProps {
    label?: string
}

export function Input({ label, ...props }: InputProps) {
    if (label) {
        return (
            <Box w="full">
                <Text
                    fontSize="14px"
                    fontWeight="medium"
                    color="primary.600"
                    mb={1.5}
                    _dark={{ color: "primary.400" }}
                >
                    {label}
                </Text>
                <ChakraInput {...props} />
            </Box>
        )
    }

    return <ChakraInput {...props} />
}

export type { InputProps }
