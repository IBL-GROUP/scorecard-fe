import { Button as ChakraButton } from "@chakra-ui/react"
import type { ButtonProps as ChakraButtonProps } from "@chakra-ui/react"

type CustomVariant = 'primary' | 'secondary' | 'gray' | 'black' | 'primaryOutline' | 'secondaryOutline' | 'error' | 'success' | 'warning'

export type ButtonProps = Omit<ChakraButtonProps, 'variant'> & {
    variant?: CustomVariant
}

export function Button(props: ButtonProps) {
    return <ChakraButton {...props as ChakraButtonProps} />
}
