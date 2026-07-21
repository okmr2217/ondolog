import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface BaseProps {
  children: React.ReactNode;
}

interface RootProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ResponsiveDialogProps extends BaseProps {
  className?: string;
  asChild?: true;
}

const SM = "(min-width: 640px)";

const ResponsiveDialog = ({ children, ...props }: RootProps) => {
  const isDesktop = useMediaQuery(SM);
  if (isDesktop) return <Dialog {...props}>{children}</Dialog>;
  return <Drawer {...props}>{children}</Drawer>;
};

const ResponsiveDialogTrigger = ({ className, children, ...props }: ResponsiveDialogProps) => {
  const isDesktop = useMediaQuery(SM);
  const Component = isDesktop ? DialogTrigger : DrawerTrigger;
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogClose = ({ className, children, ...props }: ResponsiveDialogProps) => {
  const isDesktop = useMediaQuery(SM);
  const Component = isDesktop ? DialogClose : DrawerClose;
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogContent = ({ className, children }: ResponsiveDialogProps) => {
  const isDesktop = useMediaQuery(SM);
  if (isDesktop) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
            "flex flex-col border bg-background shadow-lg rounded-lg max-h-[90dvh]",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className,
          )}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }
  return <DrawerContent className={className}>{children}</DrawerContent>;
};

const ResponsiveDialogDescription = ({ className, children, ...props }: ResponsiveDialogProps) => {
  const isDesktop = useMediaQuery(SM);
  const Component = isDesktop ? DialogDescription : DrawerDescription;
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogHeader = ({ className, children, ...props }: ResponsiveDialogProps) => {
  const isDesktop = useMediaQuery(SM);
  if (isDesktop) {
    return (
      <DialogHeader className={cn("p-6", className)} {...props}>
        {children}
      </DialogHeader>
    );
  }
  return (
    <DrawerHeader className={cn("pb-6", className)} {...props}>
      {children}
    </DrawerHeader>
  );
};

const ResponsiveDialogTitle = ({ className, children, ...props }: ResponsiveDialogProps) => {
  const isDesktop = useMediaQuery(SM);
  const Component = isDesktop ? DialogTitle : DrawerTitle;
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const ResponsiveDialogBody = ({ className, children, ...props }: Omit<ResponsiveDialogProps, "asChild">) => {
  return (
    <div className={cn("px-4 md:px-6", className)} {...props}>
      {children}
    </div>
  );
};

const ResponsiveDialogFooter = ({ className, children, ...props }: ResponsiveDialogProps) => {
  const isDesktop = useMediaQuery(SM);
  if (isDesktop) {
    return (
      <DialogFooter className={cn("p-6", className)} {...props}>
        {children}
      </DialogFooter>
    );
  }
  return (
    <DrawerFooter className={className} {...props}>
      {children}
    </DrawerFooter>
  );
};

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
};
