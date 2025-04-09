import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

// Marquer une notification comme lue
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID de notification manquant" },
        { status: 400 }
      );
    }

    const notificationRef = doc(db, "notifications", id);
    await updateDoc(notificationRef, {
      lue: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la notification:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la notification" },
      { status: 500 }
    );
  }
}

// Marquer toutes les notifications d'un utilisateur comme lues
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "UserId manquant" }, { status: 400 });
    }

    const notificationsRef = collection(db, "notifications");
    const notificationsQuery = query(
      notificationsRef,
      where("userId", "==", userId),
      where("lue", "==", false)
    );

    const snapshot = await getDocs(notificationsQuery);

    // Mise à jour en batch pour de meilleures performances
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((docSnapshot) => {
      const notificationRef = doc(db, "notifications", docSnapshot.id);
      batch.update(notificationRef, { lue: true });
      count++;
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      count: count,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des notifications:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des notifications" },
      { status: 500 }
    );
  }
}

// Supprimer une notification
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de notification manquant" },
        { status: 400 }
      );
    }

    const notificationRef = doc(db, "notifications", id);
    await deleteDoc(notificationRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de la notification:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la notification" },
      { status: 500 }
    );
  }
}
