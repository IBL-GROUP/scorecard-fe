import { defineRecipe } from "@chakra-ui/react"

export const buttonRecipe = defineRecipe({
    className: "chakra-button",
    base: {
        display: "inline-flex",
        appearance: "none",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        position: "relative",
        borderRadius: "md",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        borderWidth: "1px",
        borderColor: "transparent",
        cursor: "pointer",
        flexShrink: "0",
        outline: "0",
        lineHeight: "1.2",
        fontWeight: "medium",
        fontSize: "14px",
        p: "2.5",
        transitionProperty: "all",
        transitionDuration: "200ms",
        _disabled: {
            opacity: 0.4,
            cursor: "not-allowed",
            boxShadow: "none",
        },
        _hover: {
            _disabled: {
                bg: "initial",
            },
        },
    },

    variants: {
        size: {
            sm: {
                fontSize: "13px",
                p: "2",
                gap: "1.5",
            },
            md: {
                fontSize: "14px",
                p: "2.5",
                gap: "2",
            },
            lg: {
                fontSize: "15px",
                p: "3",
                gap: "2",
            },
        },

        variant: {
            primary: {
                bg: "primary.500",
                color: "white",
                _hover: {
                    bg: "primary.600",
                },
                _active: {
                    bg: "primary.700",
                },
            },

            secondary: {
                bg: "secondary.500",
                color: "white",
                _hover: {
                    bg: "secondary.600",
                },
                _active: {
                    bg: "secondary.700",
                },
            },

            gray: {
                bg: "gray.200",
                color: "gray.800",
                _hover: {
                    bg: "gray.300",
                },
                _active: {
                    bg: "gray.400",
                },
                _dark: {
                    bg: "gray.700",
                    color: "gray.100",
                    _hover: {
                        bg: "gray.600",
                    },
                    _active: {
                        bg: "gray.500",
                    },
                },
            },

            black: {
                bg: "gray.900",
                color: "white",
                _hover: {
                    bg: "gray.800",
                },
                _active: {
                    bg: "gray.700",
                },
                _dark: {
                    bg: "gray.100",
                    color: "gray.900",
                    _hover: {
                        bg: "gray.200",
                    },
                    _active: {
                        bg: "gray.300",
                    },
                },
            },

            primaryOutline: {
                bg: "transparent",
                borderColor: "primary.500",
                color: "primary.600",
                _hover: {
                    bg: "primary.50",
                    _dark: {
                        bg: "primary.900/20",
                    },
                },
                _active: {
                    bg: "primary.100",
                    _dark: {
                        bg: "primary.900/30",
                    },
                },
                _dark: {
                    // primary.400 is 4.2:1 on the dark page; 300 meets WCAG AA (S5).
                    color: "primary.300",
                    borderColor: "primary.300",
                },
            },

            secondaryOutline: {
                bg: "transparent",
                borderColor: "secondary.500",
                color: "secondary.600",
                _hover: {
                    bg: "secondary.50",
                    _dark: {
                        bg: "secondary.900/20",
                    },
                },
                _active: {
                    bg: "secondary.100",
                    _dark: {
                        bg: "secondary.900/30",
                    },
                },
                _dark: {
                    color: "secondary.400",
                    borderColor: "secondary.400",
                },
            },

            error: {
                bg: "red.500",
                color: "white",
                _hover: {
                    bg: "red.600",
                },
                _active: {
                    bg: "red.700",
                },
            },

            success: {
                bg: "green.500",
                color: "white",
                _hover: {
                    bg: "green.600",
                },
                _active: {
                    bg: "green.700",
                },
            },

            warning: {
                bg: "yellow.500",
                color: "white",
                _hover: {
                    bg: "yellow.600",
                },
                _active: {
                    bg: "yellow.700",
                },
            },
        },
    },

    defaultVariants: {
        size: "md",
        variant: "primary",
    },
})
