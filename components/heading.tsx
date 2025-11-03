import { cn } from "@/lib/utils"

function PageHeader({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <section className={cn("", className)} {...props}>
            <div className="container-wrapper">
                <div className="container flex flex-col items-start gap-1 pb-4 md:pb-6 lg:py-8">
                    {children}
                </div>
            </div>
        </section>
    )
}

function PageHeaderHeading({
    className,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h1
            className={cn(
                "text-2xl font-bold leading-tight tracking-tighter sm:text-3xl md:text-4xl lg:leading-[1.1]",
                className
            )}
            {...props}
        />
    )
}

function PageHeaderDescription({
    className,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn(
                "max-w-2xl text-balance text-medium font-light text-foreground sm:text-lg",
                className
            )}
            {...props}
        />
    )
}

function PageActions({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "flex w-full items-center justify-start gap-2 pt-2",
                className
            )}
            {...props}
        />
    )
}

export { PageActions, PageHeader, PageHeaderDescription, PageHeaderHeading }