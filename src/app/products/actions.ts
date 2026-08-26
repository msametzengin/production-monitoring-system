"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { facilityProductSchema } from "@/lib/validations/facility-product";

export type ProductFormState = {
    errors?: {
        code?: string[];
        name?: string[];
        category?: string[];
        description?: string[];
        measurementUnit?: string[];
        isActive?: string[];
    };
    message?: string;
};

function getProductFormData(formData: FormData) {
    return {
        code: formData.get("code"),
        name: formData.get("name"),
        category: formData.get("category") ?? "",
        description: formData.get("description") ?? "",
        measurementUnit: formData.get("measurementUnit"),
        isActive: formData.get("isActive"),
    };
}

function revalidateProductPages() {
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/facilities");
    revalidatePath("/production");
    revalidatePath("/production/new");
    revalidatePath("/targets");
}

export async function createProduct(
    _previousState: ProductFormState,
    formData: FormData,
): Promise<ProductFormState> {
    const validationResult = productSchema.safeParse(
        getProductFormData(formData),
    );

    if (!validationResult.success) {
        return {
            errors: validationResult.error.flatten().fieldErrors,
            message: "Lütfen formdaki hatalı alanları kontrol edin.",
        };
    }

    const data = validationResult.data;

    const existingProduct = await prisma.product.findUnique({
        where: {
            code: data.code,
        },
    });

    if (existingProduct) {
        return {
            errors: {
                code: ["Bu ürün kodu zaten kullanılıyor."],
            },
            message: "Ürün oluşturulamadı.",
        };
    }

    try {
        await prisma.product.create({
            data: {
                code: data.code,
                name: data.name,
                category: data.category ?? null,
                description: data.description ?? null,
                measurementUnit: data.measurementUnit,
                isActive: data.isActive,
            },
        });
    } catch (error) {
        console.error("Ürün oluşturulamadı:", error);

        return {
            message:
                "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
        };
    }

    revalidateProductPages();
    redirect("/products");
}

export async function updateProduct(
    productId: number,
    _previousState: ProductFormState,
    formData: FormData,
): Promise<ProductFormState> {
    if (!Number.isInteger(productId) || productId <= 0) {
        return {
            message: "Geçersiz ürün kaydı.",
        };
    }

    const validationResult = productSchema.safeParse(
        getProductFormData(formData),
    );

    if (!validationResult.success) {
        return {
            errors: validationResult.error.flatten().fieldErrors,
            message: "Lütfen formdaki hatalı alanları kontrol edin.",
        };
    }

    const currentProduct = await prisma.product.findUnique({
        where: {
            id: productId,
        },
    });

    if (!currentProduct) {
        return {
            message: "Düzenlenmek istenen ürün bulunamadı.",
        };
    }

    const data = validationResult.data;

    const duplicateCode = await prisma.product.findFirst({
        where: {
            id: {
                not: productId,
            },
            code: data.code,
        },
    });

    if (duplicateCode) {
        return {
            errors: {
                code: [
                    "Bu ürün kodu başka bir ürün tarafından kullanılıyor.",
                ],
            },
            message: "Ürün güncellenemedi.",
        };
    }

    try {
        await prisma.product.update({
            where: {
                id: productId,
            },
            data: {
                code: data.code,
                name: data.name,
                category: data.category ?? null,
                description: data.description ?? null,
                measurementUnit: data.measurementUnit,
                isActive: data.isActive,
            },
        });
    } catch (error) {
        console.error("Ürün güncellenemedi:", error);

        return {
            message:
                "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
        };
    }

    revalidateProductPages();
    redirect("/products");
}

export type FacilityProductFormState = {
    errors?: {
        facilityId?: string[];
        nominalDailyCapacity?: string[];
        isActive?: string[];
    };
    message?: string;
};

export async function createFacilityProduct(
    productId: number,
    _previousState: FacilityProductFormState,
    formData: FormData,
): Promise<FacilityProductFormState> {
    if (!Number.isInteger(productId) || productId <= 0) {
        return {
            message: "Geçersiz ürün kaydı.",
        };
    }

    const validationResult = facilityProductSchema.safeParse({
        facilityId: formData.get("facilityId"),
        nominalDailyCapacity:
            formData.get("nominalDailyCapacity"),
        isActive: formData.get("isActive"),
    });

    if (!validationResult.success) {
        return {
            errors: validationResult.error.flatten().fieldErrors,
            message: "Lütfen formdaki hatalı alanları kontrol edin.",
        };
    }

    const product = await prisma.product.findUnique({
        where: {
            id: productId,
        },
    });

    if (!product || !product.isActive) {
        return {
            message: "Ürün bulunamadı veya aktif değil.",
        };
    }

    const data = validationResult.data;

    const facility = await prisma.facility.findUnique({
        where: {
            id: data.facilityId,
        },
    });

    if (!facility || !facility.isActive) {
        return {
            errors: {
                facilityId: ["Seçilen tesis bulunamadı veya aktif değil."],
            },
            message: "Tesis–ürün ilişkisi oluşturulamadı.",
        };
    }

    const existingRelation =
        await prisma.facilityProduct.findFirst({
            where: {
                facilityId: data.facilityId,
                productId,
            },
        });

    if (existingRelation) {
        return {
            errors: {
                facilityId: [
                    "Bu ürün seçilen tesise zaten bağlanmış.",
                ],
            },
            message: "Aynı tesis–ürün ilişkisi ikinci kez oluşturulamaz.",
        };
    }

    try {
        await prisma.facilityProduct.create({
            data: {
                facilityId: data.facilityId,
                productId,
                nominalDailyCapacity:
                    data.nominalDailyCapacity ?? null,
                isActive: data.isActive,
            },
        });
    } catch (error) {
        console.error(
            "Tesis–ürün ilişkisi oluşturulamadı:",
            error,
        );

        return {
            message:
                "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
        };
    }

    revalidateProductPages();
    revalidatePath(`/products/${productId}/facilities`);

    redirect(`/products/${productId}/facilities`);
}

export async function updateFacilityProduct(
    relationId: number,
    _previousState: FacilityProductFormState,
    formData: FormData,
): Promise<FacilityProductFormState> {
    if (!Number.isInteger(relationId) || relationId <= 0) {
        return {
            message: "Geçersiz tesis–ürün ilişkisi.",
        };
    }

    const validationResult = facilityProductSchema.safeParse({
        facilityId: formData.get("facilityId"),
        nominalDailyCapacity:
            formData.get("nominalDailyCapacity"),
        isActive: formData.get("isActive"),
    });

    if (!validationResult.success) {
        return {
            errors: validationResult.error.flatten().fieldErrors,
            message: "Lütfen formdaki hatalı alanları kontrol edin.",
        };
    }

    const currentRelation =
        await prisma.facilityProduct.findUnique({
            where: {
                id: relationId,
            },
            include: {
                product: true,
                facility: true,
            },
        });

    if (!currentRelation) {
        return {
            message: "Düzenlenmek istenen tesis–ürün ilişkisi bulunamadı.",
        };
    }

    const data = validationResult.data;

    if (data.facilityId !== currentRelation.facilityId) {
        return {
            errors: {
                facilityId: [
                    "Mevcut ilişkinin tesisi değiştirilemez. Farklı tesis için yeni ilişki oluşturmalısınız.",
                ],
            },
            message: "Tesis–ürün ilişkisi güncellenemedi.",
        };
    }

    try {
        await prisma.facilityProduct.update({
            where: {
                id: relationId,
            },
            data: {
                nominalDailyCapacity:
                    data.nominalDailyCapacity ?? null,
                isActive: data.isActive,
            },
        });
    } catch (error) {
        console.error(
            "Tesis–ürün ilişkisi güncellenemedi:",
            error,
        );

        return {
            message:
                "Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.",
        };
    }

    revalidateProductPages();
    revalidatePath(
        `/products/${currentRelation.productId}/facilities`,
    );

    redirect(
        `/products/${currentRelation.productId}/facilities`,
    );
}