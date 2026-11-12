import { defineRecipe } from "@chakra-ui/react"

export const inputRecipe = defineRecipe({
    className: "chakra-input",
    base: {
        width: "100%",
        minWidth: "0",
        outline: "0",
        position: "relative",
        appearance: "none",
        transitionProperty: "all",
        transitionDuration: "200ms",
        borderRadius: "md",
        borderWidth: "1px",
        fontSize: "14px",
        color: "black",
        _dark: {
            color: "white",
        },
        _disabled: {
            opacity: 0.4,
            cursor: "not-allowed",
        },
        _placeholder: {
            color: "gray.400",
            fontSize: "14px",
            _dark: {
                color: "gray.500",
            },
        },
    },

    variants: {
        size: {
            sm: {
                fontSize: "sm",
                p: "2",
            },
            md: {
                fontSize: "md",
                p: "2.5",
            },
            lg: {
                fontSize: "lg",
                p: "2.5",
            },
            xl: {
                fontSize: "xl",
                p: "3",
            },
        },

        variant: {
            primary: {
                borderColor: "gray.300",
                bg: "white",
                _dark: {
                    borderColor: "gray.600",
                    bg: "gray.800",
                },
                _hover: {
                    borderColor: "primary.500",
                    _dark: {
                        borderColor: "primary.400",
                    },
                },
                _focus: {
                    borderColor: "primary.500",
                    boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)",
                    _dark: {
                        borderColor: "primary.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)",
                    },
                },
                _focusVisible: {
                    borderColor: "primary.500",
                    boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)",
                    _dark: {
                        borderColor: "primary.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)",
                    },
                },
            },
        },
    },

    defaultVariants: {
        size: "md",
        variant: "primary",
    },
})
